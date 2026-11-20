variable "aws_region" {
  type    = string
  default = "us-west-1"
}

variable "name" {
  type    = string
  default = "loeberland"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,29}$", var.name))
    error_message = "Use 3–30 lowercase letters, digits and hyphens, starting with a letter."
  }
}

variable "game_domain" {
  description = "Backend hostname; point its DNS A record at the elastic_ip output."
  type        = string
  validation {
    condition     = can(regex("^[a-zA-Z0-9][a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.game_domain))
    error_message = "Supply a DNS hostname such as game.example.com, without a scheme or path."
  }
}

variable "allowed_origins" {
  type    = list(string)
  default = ["https://johnloeber.com", "https://www.johnloeber.com", "https://datamine.github.io"]
  validation {
    condition     = alltrue([for origin in var.allowed_origins : can(regex("^https://[a-zA-Z0-9.-]+(:[0-9]+)?$", origin))])
    error_message = "Origins must be HTTPS scheme and host, with an optional port and no path."
  }
}

variable "instance_type" {
  description = "An x86_64 instance type. t3.large is a starting size, not a capacity guarantee."
  type        = string
  default     = "t3.large"
}
