output "elastic_ip" {
  value = aws_eip.game.public_ip
}

output "game_url" {
  value = "https://${var.game_domain}/explore.html"
}

output "websocket_url" {
  value = "wss://${var.game_domain}/ws"
}

output "backup_bucket" {
  value = aws_s3_bucket.game.id
}

output "instance_id" {
  value = aws_instance.game.id
}

output "connect" {
  value = "aws ssm start-session --region ${var.aws_region} --target ${aws_instance.game.id}"
}

output "deploy_update" {
  value = "aws ssm send-command --region ${var.aws_region} --instance-ids ${aws_instance.game.id} --document-name AWS-RunShellScript --parameters 'commands=[\"/usr/local/sbin/loeberland-deploy\"]'"
}
