setEnvs([
    SERVICE:"trainer-book-back-end",
    vault_secret_engine: "trainers"
])
setEnvsFromVault(
        [   
            [secret_path: "trainers/branches", vaultKey: "prd_branches"],
            [secret_path: "trainers/service-account", vaultKey: "username"],
            [secret_path: "trainers/service-account", vaultKey: "password"],

        ]
)
sonar([qualityCheck:false])
dockerBuildPush()
if (readJSON(text: env.PRD_BRANCHES).any{ pattern -> env.BRANCH_NAME ==~ pattern }){
            node("docker") {
                tar_name = env.SERVICE + "-" + new Date().format("yyyy-MM-dd") + ".tar"
                sh "docker login -p ${env.PASSWORD} -u ${env.USERNAME} artifactory.app.iaf"
                sh "docker pull artifactory.app.iaf/f16-trainers-docker-prod/${env.SERVICE}:latest"
                sh "docker tag artifactory.app.iaf/f16-trainers-docker-prod/${env.SERVICE}:latest openshift-image-registry.apps.oscp-prod.iaf/trainers-book/${env.SERVICE}:latest"
                sh "docker save openshift-image-registry.apps.oscp-prod.iaf/trainers-book/${env.SERVICE}:latest -o ${tar_name}" 
                stash name: tar_name, includes: tar_name
    }
} 
node("ubi8-maav"){
    container("ubi8-maav"){
                unstash tar_name
                 def commands = uploadToS3(patterns: [tar_name], configFromVault: true , uploadPath: "trainers-f16/${env.SERVICE}")
                sh commands
    }
}