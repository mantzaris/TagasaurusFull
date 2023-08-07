#!/bin/bash
BUILD_INSTALLER=true

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
