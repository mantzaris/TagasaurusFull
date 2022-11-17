
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OSTARGETS="--linux=rpm deb"  BUILD_EXECUTABLE=false npm run build 
    OSTARGETS="--linux=zip"  BUILD_EXECUTABLE=true npm run build 

elif [ [ "$OSTYPE" == "cygwin" ] || ["$OSTYPE" == "msys"] || ["$OSTYPE" == "win32"] ]; then
    OSTARGETS="--win=nsis"  BUILD_EXECUTABLE=false npm run build 
    OSTARGETS="--win=zip portable"  BUILD_EXECUTABLE=true npm run build 
        # POSIX compatibility layer and Linux environment emulation for Windows
else
    echo "unsupported OS"# Unknown.
fi


# LINUXTARGETS="[\"zip\"]"  BUILD_EXECUTABLE=true npm run build
# echo "first executable complete"
# LINUXTARGETS="[\"deb\", \"rpm\"]"   BUILD_EXECUTABLE=false npm run build
