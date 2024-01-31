variable "region" {
  description = "GCP Cloud Run region"
  type        = string
}

variable "region_allcaps" {
  description = "GCP Cloud Run region but all caps"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "billing_account" {
  description = "Billing account"
  type        = string
}

variable "org_id" {
  description = "Project name"
  type        = string
}

variable "project_id" {
  description = "Project ID"
  type        = string
}
variable "project_id_snake" {
  description = "Project ID snake case"
  type        = string
}

variable "project_number" {
  description = "value of project_number"
  type        = string
}

variable "auth_token" {
  description = "value of auth_token"
  type        = string
}

variable "langsmith_api_key" {
  description = "value of langsmith_api_key"
  type        = string
}

variable "openai_api_key" {
  description = "value of openai_api_key"
  type        = string
}

variable "postgres_password" {
  description = "value of postgres_password"
  type        = string
}