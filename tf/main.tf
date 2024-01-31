resource "google_project" "main_app" {
  auto_create_network = true
  billing_account     = var.billing_account
  labels = {
    firebase = "enabled"
  }
  name       = var.project_name
  org_id     = var.org_id
  project_id = var.project_id
}

output "project_number" {
  value = google_project.main_app.number
}

resource "google_artifact_registry_repository" "gcf_artifacts" {
  description = "This repository is created and used by Cloud Functions for storing function docker images."
  format      = "DOCKER"
  labels = {
    goog-managed-by = "cloudfunctions"
  }
  location      = var.region
  project       = var.project_id
  repository_id = "gcf-artifacts"
}

resource "google_artifact_registry_repository" "cloud_run_source_deploy" {
  description   = "Cloud Run Source Deployments"
  format        = "DOCKER"
  location      = var.region
  project       = var.project_id
  repository_id = "cloud-run-source-deploy"
}

resource "google_compute_firewall" "default_allow_rdp" {
  allow {
    ports    = ["3389"]
    protocol = "tcp"
  }
  description   = "Allow RDP from anywhere"
  direction     = "INGRESS"
  name          = "default-allow-rdp"
  network       = "https://www.googleapis.com/compute/v1/projects/${var.project_id}/global/networks/default"
  priority      = 65534
  project       = var.project_id
  source_ranges = ["0.0.0.0/0"]
}

resource "google_compute_firewall" "default_allow_ssh" {
  allow {
    ports    = ["22"]
    protocol = "tcp"
  }
  description   = "Allow SSH from anywhere"
  direction     = "INGRESS"
  name          = "default-allow-ssh"
  network       = "https://www.googleapis.com/compute/v1/projects/${var.project_id}/global/networks/default"
  priority      = 65534
  project       = var.project_id
  source_ranges = ["0.0.0.0/0"]
  depends_on    = [google_project.main_app]
}

resource "google_service_account" "main_app" {
  account_id   = var.project_id
  display_name = "App Engine default service account"
  project      = var.project_id
  depends_on   = [google_project.main_app]
}

resource "google_project_iam_member" "main_app_token_creator" {
  project = var.project_id
  role    = "roles/iam.serviceAccountTokenCreator"

  member     = "serviceAccount:${google_service_account.main_app.email}"
  depends_on = [google_service_account.main_app]
}

resource "google_project_service" "cloudapis_googleapis_com" {
  project    = var.project_id
  service    = "cloudapis.googleapis.com"
  depends_on = [google_service_account.main_app]
}

resource "google_project_service" "apigateway_googleapis_com" {
  project    = var.project_id
  service    = "apigateway.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "appengine_googleapis_com" {
  project    = var.project_id
  service    = "appengine.googleapis.com"
  depends_on = [google_service_account.main_app]
}

resource "google_project_service" "artifactregistry_googleapis_com" {
  project    = var.project_id
  service    = "artifactregistry.googleapis.com"
  depends_on = [google_service_account.main_app]
}

resource "google_project_service" "cloudasset_googleapis_com" {
  project = var.project_id
  service = "cloudasset.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "cloudbuild_googleapis_com" {
  project = var.project_id
  service = "cloudbuild.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "cloudfunctions_googleapis_com" {
  project = var.project_id
  service = "cloudfunctions.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "cloudresourcemanager_googleapis_com" {
  project = var.project_id
  service = "cloudresourcemanager.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "cloudscheduler_googleapis_com" {
  project = var.project_id
  service = "cloudscheduler.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "cloudtrace_googleapis_com" {
  project = var.project_id
  service = "cloudtrace.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "containerregistry_googleapis_com" {
  project = var.project_id
  service = "containerregistry.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "datastore_googleapis_com" {
  project = var.project_id
  service = "datastore.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "eventarc_googleapis_com" {
  project = var.project_id
  service = "eventarc.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "iam_googleapis_com" {
  project = var.project_id
  service = "iam.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "iamcredentials_googleapis_com" {
  project = var.project_id
  service = "iamcredentials.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "logging_googleapis_com" {
  project = var.project_id
  service = "logging.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "monitoring_googleapis_com" {
  project = var.project_id
  service = "monitoring.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "pubsub_googleapis_com" {
  project = var.project_id
  service = "pubsub.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "run_googleapis_com" {
  project = var.project_id
  service = "run.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "secretmanager_googleapis_com" {
  project = var.project_id
  service = "secretmanager.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "servicecontrol_googleapis_com" {
  project = var.project_id
  service = "servicecontrol.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "servicemanagement_googleapis_com" {
  project = var.project_id
  service = "servicemanagement.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "serviceusage_googleapis_com" {
  project = var.project_id
  service = "serviceusage.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "storage_api_googleapis_com" {
  project = var.project_id
  service = "storage-api.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "storage_component_googleapis_com" {
  project = var.project_id
  service = "storage-component.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_project_service" "storage_googleapis_com" {
  project = var.project_id
  service = "storage.googleapis.com"
  depends_on = [google_service_account.main_app, google_project_service.cloudapis_googleapis_com]
}

resource "google_secret_manager_secret" "auth_token" {
  labels = {
    service = "auth"
    type    = "auth"
  }

  project = var.project_number

  replication {
    auto {}
  }

  secret_id  = "AUTH_TOKEN"
  depends_on = [google_project.main_app, google_project_service.secretmanager_googleapis_com]
}

resource "google_secret_manager_secret_version" "projects_secrets_auth_token_versions_1" {
  enabled     = true
  secret      = "projects/${google_project.main_app.number}/secrets/auth-token"
  secret_data = var.auth_token
  depends_on  = [google_project.main_app, google_project_service.secretmanager_googleapis_com, google_secret_manager_secret.auth_token]
}

resource "google_secret_manager_secret" "langsmith_api_key" {
  labels = {
    type    = "api-key"
    service = "langsmith"
  }

  project = var.project_number

  replication {
    auto {}
  }

  secret_id  = "LANGSMITH_API_KEY"
  depends_on = [google_project.main_app, google_project_service.secretmanager_googleapis_com]
}

resource "google_secret_manager_secret_version" "projects_secrets_langsmith_api_key_versions_1" {
  enabled     = true
  secret      = "projects/${google_project.main_app.number}/secrets/langsmith-api-key"
  secret_data = var.langsmith_api_key
  depends_on  = [google_project.main_app, google_project_service.secretmanager_googleapis_com, google_secret_manager_secret.langsmith_api_key]
}

resource "google_secret_manager_secret" "openai_api_key" {
  labels = {
    service = "open-ai"
    type    = "api-key"
  }

  project = var.project_number

  replication {
    auto {}
  }

  secret_id  = "OPENAI_API_KEY"
  depends_on = [google_project.main_app, google_project_service.secretmanager_googleapis_com]
}

resource "google_secret_manager_secret_version" "projects_secrets_openai_api_key_versions_1" {
  enabled     = true
  secret      = "projects/${google_project.main_app.number}/secrets/openai-api-key"
  secret_data = var.openai_api_key
  depends_on  = [google_project.main_app, google_project_service.secretmanager_googleapis_com, google_secret_manager_secret.openai_api_key]
}

resource "google_secret_manager_secret" "postgres_password" {
  labels = {
    service = "database"
    type    = "auth"
  }

  project = var.project_number

  replication {
    auto {}
  }

  secret_id  = "POSTGRES_PASSWORD"
  depends_on = [google_project.main_app, google_project_service.secretmanager_googleapis_com]
}

resource "google_secret_manager_secret_version" "projects_secrets_postgres_password_versions_1" {
  enabled     = true
  secret      = "projects/${google_project.main_app.number}/secrets/postgres-password"
  secret_data = var.postgres_password
  depends_on  = [google_project.main_app, google_project_service.secretmanager_googleapis_com, google_secret_manager_secret.postgres_password]
}

resource "google_service_account" "default_compute" {
  account_id   = "${var.project_number}-compute"
  display_name = "Default compute service account"
  project      = var.project_id
  depends_on   = [google_project.main_app, google_project_service.iam_googleapis_com, google_project_service.iamcredentials_googleapis_com]
}

resource "google_service_account" "artifact_registry" {
  account_id   = "artifact-registry"
  description  = "artifact registry"
  display_name = "artifact-registry"
  project      = var.project_id
  depends_on   = [google_project.main_app, google_project_service.iam_googleapis_com, google_project_service.iamcredentials_googleapis_com]
}

resource "google_service_account" "cloud_runner" {
  account_id   = "cloud-runner"
  description  = "For cloud run"
  display_name = "cloud-runner"
  project      = var.project_id
  depends_on   = [google_project.main_app, google_project_service.iam_googleapis_com, google_project_service.iamcredentials_googleapis_com]
}

resource "google_service_account" "copper_citron_412303" {
  account_id   = var.project_id
  display_name = "App Engine default service account"
  project      = var.project_id
  depends_on   = [google_project.main_app, google_project_service.iam_googleapis_com, google_project_service.iamcredentials_googleapis_com]
}

resource "google_service_account" "invoker" {
  account_id   = "invoker"
  description  = "for invoker"
  display_name = "invoker"
  project      = var.project_id
  depends_on   = [google_project.main_app, google_project_service.iam_googleapis_com, google_project_service.iamcredentials_googleapis_com]
}

resource "google_service_account" "office_deployer" {
  account_id   = "office-deployer"
  description  = "like regular deployer, but from the office"
  display_name = "office-deployer"
  project      = var.project_id
  depends_on   = [google_project.main_app, google_project_service.iam_googleapis_com, google_project_service.iamcredentials_googleapis_com]
}

resource "google_service_account" "semar_api_gateway" {
  account_id   = "semar-api-gateway"
  description  = "for api gateway"
  display_name = "semar-api-gateway"
  project      = var.project_id
  depends_on   = [google_project.main_app, google_project_service.iam_googleapis_com, google_project_service.iamcredentials_googleapis_com]
}

resource "google_service_account" "superadmin" {
  account_id   = "superadmin"
  description  = "superadmin"
  display_name = "superadmin"
  project      = var.project_id
  depends_on   = [google_project.main_app, google_project_service.iam_googleapis_com, google_project_service.iamcredentials_googleapis_com]
}

resource "google_storage_bucket" "artifacts_appspot_com" {
  force_destroy            = false
  location                 = "ASIA"
  name                     = "asia.artifacts.${var.project_id}.appspot.com"
  project                  = var.project_id
  public_access_prevention = "inherited"
  storage_class            = "STANDARD"
  depends_on               = [google_project.main_app]
}

resource "google_storage_bucket" "gcf_v2_sources" {
  cors {
    method = ["GET"]
    origin = ["https://*.cloud.google.com", "https://*.corp.google.com", "https://*.corp.google.com:*", "https://*.cloud.google", "https://*.byoid.goog"]
  }

  force_destroy = false

  lifecycle_rule {
    action {
      type = "Delete"
    }

    condition {
      num_newer_versions = 3
      with_state         = "ARCHIVED"
    }
  }

  location                    = var.region_allcaps
  name                        = "gcf-v2-sources-${var.project_number}-${var.region}"
  project                     = var.project_id
  public_access_prevention    = "inherited"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  depends_on                  = [google_project.main_app]

  versioning {
    enabled = true
  }
}

resource "google_storage_bucket" "gcf_v2_uploads" {
  cors {
    method          = ["PUT"]
    origin          = ["https://*.cloud.google.com", "https://*.corp.google.com", "https://*.corp.google.com:*", "https://*.cloud.google", "https://*.byoid.goog"]
    response_header = ["content-type"]
  }

  force_destroy = false

  lifecycle_rule {
    action {
      type = "Delete"
    }

    condition {
      age        = 1
      with_state = "ANY"
    }
  }

  location                    = var.region_allcaps
  name                        = "gcf-v2-uploads-${var.project_number}-${var.region}"
  project                     = var.project_id
  public_access_prevention    = "inherited"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  depends_on                  = [google_project.main_app]
}