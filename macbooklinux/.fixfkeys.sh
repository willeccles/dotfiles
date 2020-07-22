#! /bin/sh
# add this line to crontab as root ('sudo crontab -e'):
#  @reboot /home/<name>/.fixfkeys.sh
# fix the f keys on the macbook pro
echo 2 | tee /sys/module/hid_apple/parameters/fnmode
