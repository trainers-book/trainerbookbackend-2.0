# This script is used in Bamboo environment for cd
# THIS SCRIPT REQUIRE AN AGENT WITH DOCKER
# Required environment variables:
# - DEPLOY_ENV - "int" for Shvil, "prod" for Mamdas
# - PACK_VERSION_TAG - "true" if you wish to save the image with version tag to the tar

set -e

echo "Pruning docker objects"
docker system prune -f

echo "Branch name: $bamboo_repository_branch_name"

version_tag_from_file=$(cat version*.txt)
echo "Version tag from package.json: $version_tag_from_file"

if [ $bamboo_repository_branch_name == "dev" ]
then
	tag=dev-latest
    version_tag=$('dev-' + $version_tag_from_file)
elif [ $bamboo_repository_branch_name == "master" ]
then
	tag=latest
	version_tag=$version_tag_from_file
else
	tag=try
	version_tag=try
fi

echo "Tag: $tag"
echo "Version tag: $version_tag"
echo

if [ $DEPLOY_ENV == "int" ]
then
    REGISTRY=$bamboo_OSFT_REGISTRY
else
    REGISTRY=$bamboo_OSFT_REGISTRY_SHVIL
fi

images=()

if [[ $tag ]]
then
	echo "Building image"
	echo $DEPLOY_ENV
	docker build --no-cache -t $REGISTRY/$bamboo_OSFT_PROJECT/$bamboo_IMAGE_NAME --build-arg DEPLOY_ENV=$DEPLOY_ENV .
    
    echo
    docker tag $REGISTRY/$bamboo_OSFT_PROJECT/$bamboo_IMAGE_NAME $REGISTRY/$bamboo_OSFT_PROJECT/$bamboo_IMAGE_NAME:$tag
    if [ $DEPLOY_ENV == "int" ]
    then
        echo "Logging in"
        docker login -p $bamboo_OSFT_PASSWORD -u serviceaccount $bamboo_OSFT_REGISTRY
        echo "Pushing $REGISTRY/$bamboo_OSFT_PROJECT/$bamboo_IMAGE_NAME:$tag"
        docker push $REGISTRY/$bamboo_OSFT_PROJECT/$bamboo_IMAGE_NAME:$tag
    else
        echo "Packing $REGISTRY/$bamboo_OSFT_PROJECT/$bamboo_IMAGE_NAME:$tag"
        images+="$REGISTRY/$bamboo_OSFT_PROJECT/$bamboo_IMAGE_NAME:$tag "
    fi 
fi

if [[ $version_tag ]]
then
    echo
    docker tag $REGISTRY/$bamboo_OSFT_PROJECT/$bamboo_IMAGE_NAME $REGISTRY/$bamboo_OSFT_PROJECT/$bamboo_IMAGE_NAME:$version_tag
    if [ $DEPLOY_ENV == "int" ]
    then
    	echo "Logging in"
    	docker login -p $bamboo_OSFT_PASSWORD -u serviceaccount $bamboo_OSFT_REGISTRY
        echo "Pushing $REGISTRY/$bamboo_OSFT_PROJECT/$bamboo_IMAGE_NAME:$version_tag"
        docker push $REGISTRY/$bamboo_OSFT_PROJECT/$bamboo_IMAGE_NAME:$version_tag
    elif [ $PACK_VERSION_TAG == true ]
    then
        echo "Packing $REGISTRY/$bamboo_OSFT_PROJECT/$bamboo_IMAGE_NAME:$version_tag"
        images+="$REGISTRY/$bamboo_OSFT_PROJECT/$bamboo_IMAGE_NAME:$tag"
    fi
fi


if [ $DEPLOY_ENV == "prod" ] && [ ${#images[@]} -ne 0 ]
then
    date=`date '+%H-%M-%S'`
    echo "Saving $images to $bamboo_IMAGE_NAME-$date.tar"
    docker save -o "$bamboo_IMAGE_NAME-$date.tar" $images
fi
