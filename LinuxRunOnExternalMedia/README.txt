
# This script helps Linux users run Tagasaurus when the executable is on external media (like a usb or external HD) formatted in a way which prevents executing programs on it (eg vFAT)
# The script searches for Tagasaurus and runs it
# Looks for Tagasaurus in the current and above directory
# At the terminal use 'source tagasaurus-run.sh' with the script in the same directory as the executable or with the script in a directory deeper
# Path to Tagasaurus can be provided as argument instead to avoid the search
# You can also do 'source tagasaurus-run.sh /path/to/linux/tagasaurus/executable'
# If Tagasaurus is found on a USB drive that is not allowed to run, will remount it with the appropriate permissions
