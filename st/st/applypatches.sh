#! /bin/bash

for p in *.diff; do
    echo "Applying $p"
    patch -N --dry-run --silent < "$p" &> /dev/null
    if [[ $? == 0 ]]; then
        patch -N < "$p"
    fi
done
