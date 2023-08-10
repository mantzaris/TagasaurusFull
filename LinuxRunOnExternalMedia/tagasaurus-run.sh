#!/usr/bin/env bash

# This script helps Linux users run Tagasaurus when the executable is on external media (like a usb or external HD) formatted in a way which prevents executing programs on it (eg vFAT)
# The script searches for Tagasaurus and runs it
# Looks Tagasaurus in the current and above directory
# At the terminal use 'source tagasaurus-run.sh' with the script in the same directory as the executable or with the script in a directory deeper
# Path to Tagasaurus can be provided as argument
# You can also do 'source tagasaurus-run.sh /path/to/linux/tagasaurus/executable'
# If Tagasaurus is found on a USB drive that is not allowed to run, will remount it with the appropriate permissions


# set -e
# set -x

unset ts_found
unset ts_path_checked
unset ts_path_selected

# Using path of script if path not passed as argument
if [[ -z $1 ]]; then ts_path_input=$(dirname "$0"); else 
  if [[ -d $1 ]]; then ts_path_input="$1"; else echo "Input path is \"$1\" and doesn't exist. Exit."; return; fi 
fi

# Function for remount
remount_fat () {
  echo "Remounting $1 ($2) to $3 with permission to exec."
  if [[ "$EUID" = 0 ]]; then
    echo "Please use 'sudo' instead 'root'. Exit." ; return;
  else
    sudo -k
    echo "Please enter \"$(whoami)\" password."
    if sudo true; then echo "Password correct. Remounting."
    else echo "Wrong password for \"$(whoami)\" or 'sudo' not configured. Remount required a 'sudo'. Exit."; return; fi
  fi
  cd $HOME;
  sudo umount -l "$1"
  sudo mkdir -p "$3"
  sudo mount -o rw,uid=$(id -u),gid=$(id -g),utf8 "$2" "$3"
  (($? != 0)) && { echo "Remount Error. Quit."; return; }
}

ts_exec () {
  nohup $1 &>/dev/null & disown
  return
  # exit
}

# Searching Tagasaurus in current directory.
if [[ -f ./tagasaurus && "application" == $(file -b --mime-type ./tagasaurus | sed 's|/.*||') ]]; then 

  # Runs Tagasaurus if drive not USB or mount point already has `exec` permission and application in current directory.
  if [[ -n $(findmnt -O noshowexec -nr -o TARGET --target ./tagasaurus) \
    || -n $(findmnt -O exec -nr -o TARGET --target ./tagasaurus) \
    || -n $(findmnt -t novfat,noexfat -nr -o TARGET --target ./tagasaurus) ]]; then echo "Tagasaurus found, run."; ts_exec ./tagasaurus; fi
  
  # If mount point has not `exec` permission: remount and runs Tagasaurus
  noexec_mnt=$(findmnt -O showexec,noexec -t vfat,exfat -nr -o TARGET --target ./tagasaurus)
  mount_to="$(dirname "$noexec_mnt")/Tagasaurus"
  if [[ -n $noexec_mnt ]]; then
    echo "Storage mounted without 'exec' permissions. Trying to remount."
    noexec_blk=$(findmnt -O showexec,noexec -t vfat,exfat -nr -o SOURCE --target ./tagasaurus)
    remount_fat "$noexec_mnt" "$noexec_blk" "$mount_to"
    echo "Remounted to $mount_to. Tagasaurus running."; 
    if ! ts_found=$(find "$ts_path_input" -maxdepth 2 -type f -iname "tagasaurus"); then echo "Searching error. Exit."; return; fi
    parent=${ts_found%/*}
    ts_exec "$mount_to/${parent##*/}/tagasaurus"
  fi

# Else serching all Tagasaurus application folders in the current and above directory
else
  if ! ts_found=$(find "$ts_path_input" -maxdepth 2 -type f -iname "tagasaurus"); then echo "Searching error. Exit."; return; fi  
  if [[ -z "$ts_found" ]]; then echo "Tagasaurus not found. Exit"; return; fi
  
  # Checking if only one Tagasaurus application folders found, selecting first if more than one
  if [[ $(echo "$ts_found" | wc -l) -gt 0 ]]; then
    # Filtering applications
    for ts_path in $ts_found; do
      echo "checking: $ts_path"
      if [[ -f $ts_path && "application" == $(file -b --mime-type "$ts_path" | sed 's|/.*||') ]]; then ts_path_checked+="$ts_path"$'\n'; fi
    done
    ts_path_checked=$(echo $ts_path_checked | sed '/^$/d')
  fi

  if [[ -z "$ts_path_checked" ]]; then echo "Tagasaurus not found."; return;fi
  
  ts_path_selected=$ts_path_checked

  if [[ $(echo "$ts_path_checked" | wc -l) -gt 1 ]]; then 
    echo -e "Found multiple Tagasaurus folders:\n $ts_path_checked"
    ts_path_selected=$(echo -n $ts_path_checked | head -n 1)
    echo -n "Selecting first. "
  fi

  echo "Running: $ts_path_selected"
  # Runs Tagasaurus if mount point has `exec` permission
  if [[ -n $(findmnt -O noshowexec -nr -o TARGET --target $ts_path_selected) \
    || -n $(findmnt -O exec -nr -o TARGET --target $ts_path_selected) \
    || -n $(findmnt -t novfat,noexfat -nr -o TARGET --target $ts_path_selected) ]]; \
    then echo "Tagasaurus found, run."; 
    ts_exec "$ts_path_selected"
  fi

  # If mount point has not `exec` permission: remount and runs Tagasaurus
  noexec_mnt=$(findmnt -O showexec,noexec -t vfat,exfat -nr -o TARGET --target "$ts_path_selected")
  mount_to="$(dirname "$noexec_mnt")/Tagasaurus"
  if [[ -n $noexec_mnt ]]; then
    echo "Storage mounted without 'exec' permissions. Trying to remount."
    noexec_blk=$(findmnt -O showexec,noexec -t vfat,exfat -nr -o SOURCE --target "$ts_path_selected")
    remount_fat "$noexec_mnt" "$noexec_blk" "$mount_to"
    echo "Remounted to $mount_to. Tagasaurus running."; 
    parent=${ts_path_selected%/*}
    ts_exec "$mount_to/${parent##*/}/tagasaurus"
  fi

fi
