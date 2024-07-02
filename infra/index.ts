import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";
import * as gcp from "@pulumi/gcp";
import * as path from "node:path";
import * as fs from "node:fs";
import { Repository } from "@pulumi/gcp/artifactregistry";

const dockerImageName = "ttychat-server-image";
const dockerImageTag = "latest";

const artifactRegistryServiceName = "ttychat-server-artifacts-service";
const artifactRegistryRepoName = "ttychat-server-artifacts";
const artifactRegistryRepoLocation = "asia-northeast1";

// const cloudRunAdminServiceName = "ttychat-server-admin-service";
const cloudRunServiceName = "ttychat-server-service";
const cloudRunServiceLocation = "asia-northeast1";

const dockerGCPServer = artifactRegistryRepoLocation + "-docker.pkg.dev";
const dockerImageWithPath = pulumi.interpolate`${dockerGCPServer}/${gcp.config.project}/${artifactRegistryRepoName}/${dockerImageName}:${dockerImageTag}`;

/** ENABLE GCP SERVICES*/
const enabledServices = enableServices();
const artifactRepo = createArtifactRepo(enabledServices)
const image = buildPushImage(enabledServices, artifactRepo)
const cloudRunServiceUri = deployCloudRunService(enabledServices, image)

console.log(cloudRunServiceUri)

function enableServices() {
    const enableArtifactRegistry = new gcp.projects.Service("EnableArtifactRegistry", { service: "artifactregistry.googleapis.com" })
    const enableCloudRun = new gcp.projects.Service("EnableCloudRun", { service: "run.googleapis.com" })
    return { enableArtifactRegistry, enableCloudRun }
}


function createArtifactRepo(enabledServices: ReturnType<typeof enableServices>) {
    const artifactRepo = new gcp.artifactregistry.Repository(artifactRegistryServiceName, {
        format: "DOCKER",
        location: artifactRegistryRepoLocation,
        repositoryId: artifactRegistryRepoName
    }, { dependsOn: [enabledServices.enableArtifactRegistry] });
    return artifactRepo;
}


function buildPushImage(enabledServices: ReturnType<typeof enableServices>, artifactRepo: Repository) {
    const serviceAccountKeyPath = process.env.GOOGLE_CREDENTIALS_FILE_PATH
    if (!serviceAccountKeyPath) throw new Error("GOOGLE_CREDENTIALS_FILE_PATH env variable is not set")

    const credentials = fs.readFileSync(serviceAccountKeyPath, "utf-8")
    const image = new docker.Image(dockerImageName, {
        build: {
            context: path.resolve(process.cwd(), "../server"),
            dockerfile: path.resolve(process.cwd(), "../server/Dockerfile"),
            platform: "linux/amd64",
        },
        imageName: dockerImageWithPath,
        skipPush: false,
        registry: {
            server: dockerGCPServer,
            username: "_json_key",
            password: credentials,
        }
    }, { dependsOn: [enabledServices.enableArtifactRegistry, artifactRepo] });
    return image
}



function deployCloudRunService(enabledServices: ReturnType<typeof enableServices>, image: docker.Image) {
    const cloudRunService = new gcp.cloudrunv2.Service(cloudRunServiceName, {
        name: cloudRunServiceName,
        location: cloudRunServiceLocation,
        template: {
            containers: [{
                image: image.imageName,
                ports: [{ containerPort: 3000 }],
                resources: {
                    limits: {
                        memory: "1Gi",
                        cpu: "1",
                    },
                },
            }],
            scaling: {
                minInstanceCount: 1,
                maxInstanceCount: 5,
            },
            executionEnvironment: "EXECUTION_ENVIRONMENT_GEN2",
        },
        ingress: "INGRESS_TRAFFIC_ALL",
        project: gcp.config.project,
    }, { dependsOn: [enabledServices.enableCloudRun, image] });

    new gcp.cloudrunv2.ServiceIamMember("invoker", {
        name: cloudRunService.name,
        location: cloudRunService.location,
        role: "roles/run.invoker",
        member: "allUsers"
    })

    return cloudRunService.uri
}