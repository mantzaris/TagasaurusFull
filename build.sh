
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OSTARGETS="--linux=rpm deb"  npm run build --build_installer=true 
    OSTARGETS="--linux=zip"  npm run build --build_installer=false 

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
