terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = { Project = var.name }
  }
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  filter {
    name   = "default-for-az"
    values = ["true"]
  }
}

data "aws_ssm_parameter" "ubuntu" {
  name = "/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id"
}

resource "aws_s3_bucket" "game" {
  bucket_prefix = "${var.name}-"
  # Keep backups on accidental terraform destroy; empty the bucket explicitly.
  force_destroy = false
}

resource "aws_s3_bucket_public_access_block" "game" {
  bucket                  = aws_s3_bucket.game.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "game" {
  bucket = aws_s3_bucket.game.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "game" {
  bucket = aws_s3_bucket.game.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "game" {
  bucket     = aws_s3_bucket.game.id
  depends_on = [aws_s3_bucket_versioning.game]
  rule {
    id     = "expire-backups"
    status = "Enabled"
    filter {
      prefix = "backups/"
    }
    expiration {
      days = 30
    }
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
  rule {
    id     = "expire-old-releases"
    status = "Enabled"
    filter {
      prefix = "releases/"
    }
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_s3_object" "release" {
  bucket      = aws_s3_bucket.game.id
  key         = "releases/game.tar.gz"
  source      = "${path.module}/game.tar.gz"
  source_hash = filemd5("${path.module}/game.tar.gz")
  depends_on  = [aws_s3_bucket_versioning.game]
}

resource "aws_iam_role" "game" {
  name_prefix = "${var.name}-"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.game.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "storage" {
  role = aws_iam_role.game.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["s3:GetObject"], Resource = ["${aws_s3_bucket.game.arn}/releases/*", "${aws_s3_bucket.game.arn}/backups/*"] },
      { Effect = "Allow", Action = ["s3:PutObject"], Resource = "${aws_s3_bucket.game.arn}/backups/*" }
    ]
  })
}

resource "aws_iam_instance_profile" "game" {
  name_prefix = "${var.name}-"
  role        = aws_iam_role.game.name
}

resource "aws_security_group" "game" {
  name_prefix = "${var.name}-"
  description = "Public HTTPS game; administration through SSM"
  vpc_id      = data.aws_vpc.default.id
  ingress {
    description = "HTTP and ACME"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "HTTPS and WebSockets"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "game" {
  ami                         = data.aws_ssm_parameter.ubuntu.value
  instance_type               = var.instance_type
  subnet_id                   = sort(data.aws_subnets.public.ids)[0]
  associate_public_ip_address = true
  vpc_security_group_ids      = [aws_security_group.game.id]
  iam_instance_profile        = aws_iam_instance_profile.game.name
  root_block_device {
    volume_type = "gp3"
    volume_size = 40
    encrypted   = true
  }
  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }
  user_data = templatefile("${path.module}/user-data.sh.tftpl", {
    bucket = aws_s3_bucket.game.id
    region = var.aws_region
    compose_env = base64encode(join("\n", [
      "COMPOSE_PROJECT_NAME=${var.name}",
      "GAME_DOMAIN=${var.game_domain}",
      "ALLOWED_ORIGINS=${join(",", distinct(concat(var.allowed_origins, ["https://${var.game_domain}"])))}",
      "BACKUP_DIR=/var/lib/loeberland/backups",
      ""
    ]))
  })
  # Releases are installed explicitly on the existing host, preserving its RAM
  # world and Docker volumes. Bootstrap and AMI upgrades need planned replacement.
  lifecycle {
    ignore_changes = [ami, user_data]
  }
  depends_on = [aws_s3_object.release, aws_iam_role_policy.storage, aws_iam_role_policy_attachment.ssm]
  tags       = { Name = var.name }
}

resource "aws_eip" "game" {
  domain   = "vpc"
  instance = aws_instance.game.id
}
