#! /bin/sh
# fix the f keys on the macbook pro
echo 2 | tee /sys/module/hid_apple/parameters/fnmode
