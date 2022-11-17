
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OSTARGETS="--linux=rpm deb"  BUILD_INSTALLER=true npm run build 
    OSTARGETS="--linux=zip"  BUILD_INSTALLER=false npm run build 

elif [ [ "$OSTYPE" == "cygwin" ] || [ "$OSTYPE" == "msys" ] || [ "$OSTYPE" == "win32" ] ]; then
    npm run rebuild
    npm run build-win-portable --build_installer=false
    npm run build-win-installer --build_installer=true
else
    echo "unsupported OS"# Unknown.
fi


# LINUXTARGETS="[\"zip\"]"  BUILD_EXECUTABLE=true npm run build
# echo "first executable complete"
# LINUXTARGETS="[\"deb\", \"rpm\"]"   BUILD_EXECUTABLE=false npm run build
