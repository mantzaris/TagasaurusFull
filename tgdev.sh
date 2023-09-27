#!/bin/bash
BUILD_INSTALLER=true
DEBUG_BUILD=true

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
    echo "{ \"BUILD_INSTALLER\": $BUILD_INSTALLER, \"DEBUG_BUILD\": $DEBUG_BUILD }" > config.json
}

if [ "$1" == "run" ]; then

    echo "running development build"
    BUILD_INSTALLER=false
    set_config
    npx cross-env OSTARGETS="--linux=deb rpm" npm run dev
    exit 0

elif [ "$1" == "pack" ]; then
    DEBUG_BUILD=false
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

        echo "building windows zip"
        BUILD_INSTALLER=false
        set_config

        npm run build-win-zip

        BUILD_INSTALLER=true
        echo "building windows nsis"
        set_config
        npm run build-win-nsis

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

