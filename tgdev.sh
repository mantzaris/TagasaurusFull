#!/bin/bash
BUILD_INSTALLER=true

# Check dependencies
check_dependency() {
    command -v "$1" >/dev/null 2>&1 || { echo >&2 "$1 is required but it's not installed. Aborting."; exit 1; }
}

check_dependency unzip
check_dependency zip
check_dependency npm
check_dependency npx
#########

set_config(){
    echo "{ \"BUILD_INSTALLER\": $BUILD_INSTALLER }" > config.json
}

if [ "$1" == "run" ]; then

    echo "running development build"
    BUILD_INSTALLER=false
    set_config
    npx cross-env OSTARGETS="--linux=deb rpm" npm run dev
    exit 0

elif [ "$1" == "pack" ]; then

    echo "cleaning dependencies"
    npm run rebuild

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then

        echo "building linux installers"
        set_config
        npx cross-env OSTARGETS="--linux=deb rpm" npm run build
        
        echo "building linux zip"
        BUILD_INSTALLER=false
        set_config
        npx cross-env OSTARGETS="--linux=zip" npm run build

        # Unzip the build and zip again after the unpacked directory holding the LinuxRunOnExternalMedia for the USB remount script, is moved to the app root directory for the user to access easily
        for zip_file in dist/tagasaurus-*.zip; do
            # Extract the version or unique identifier from the filename
            identifier=$(basename "$zip_file" .zip | cut -d'-' -f2)
            # Extract the ZIP file
            unzip "$zip_file" -d dist/tempDir || { echo "Failed to unzip $zip_file."; exit 1; }
            # Copy the directory within the extracted contents
            cp -r dist/tempDir/resources/app.asar.unpacked/LinuxRunOnExternalMedia dist/tempDir/LinuxRunOnExternalMedia
            # Recreate the ZIP file with the modified contents
            (
                cd dist/tempDir || exit
                zip -r "../tagasaurus-$identifier-Linux.zip" .
            )
            # Clean up: remove the extracted contents and the original ZIP
            rm -rf dist/tempDir
            rm "$zip_file"
        done

    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then

        echo "building windows nsis"
        set_config
        npx cross-env OSTARGETS="--win=nsis" npm run build

        echo "building windows zip"
        BUILD_INSTALLER=false
        set_config
        npx cross-env OSTARGETS="--win=zip" npm run build
        
    else
        echo "unsupported OS" # Unknown.
    fi


elif [ "$1" == "clean" ]; then
    echo "cleaning dependencies"
    npm run clean

elif [ "$1" == "rebuild" ]; then
    echo "cleaning dependencies and rebuilding dependencies"
    npm run rebuild

else 
    echo "expected argument 'run' | 'pack' | 'clean' | 'rebuild' "
fi


# So that the linux run on USB is at top level 
    # # Extract the ZIP file
    # unzip dist/yourApp-linux-x64.zip -d dist/tempDir

    # # Copy the directory within the extracted contents
    # cp -r dist/tempDir/resources/app.asar.unpacked/yourDirectory dist/tempDir/destinationDirectory

    # # Recreate the ZIP file with the modified contents
    # cd dist/tempDir
    # zip -r ../yourApp-linux-x64-modified.zip .
    # cd -

    # # Clean up: remove the extracted contents and the original ZIP
    # rm -r dist/tempDir
    # rm dist/yourApp-linux-x64.zip



#    npx cross-env BUILD_INSTALLER=true npm run dev

# if [[ "$OSTYPE" == "linux-gnu"* ]]; then
#     npx cross-env BUILD_INSTALLER=true npm run dev #how can I pass OS targets here?
#     OSTARGETS="--linux=deb rpm"  npm run build --build_installer=true 
#     OSTARGETS="--linux=zip"  npm run build --build_installer=false 

# elif [ [ "$OSTYPE" == "cygwin" ] || [ "$OSTYPE" == "msys" ] || [ "$OSTYPE" == "win32" ] ]; then
#     npm run rebuild
#     npm run build-win-portable --build_installer=false
#     npm run build-win-installer --build_installer=true
# else
#     echo "unsupported OS"# Unknown.
# fi


# LINUXTARGETS="[\"zip\"]"  BUILD_EXECUTABLE=true npm run build
# echo "first executable complete"
# LINUXTARGETS="[\"deb\", \"rpm\"]"   BUILD_EXECUTABLE=false npm run build
