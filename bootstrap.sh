#! /bin/bash

# colors
GREEN="\e[32m"
RED="\e[31m"
YELLOW="\e[33m"
BOLD="\e[1m"

function colorecho() {
    printf "$1$2\e[0m\n"
}

if [[ $(id -u) != 0 ]]; then
    colorecho "$BOLD$RED" "Please run this script as root!"
    exit 1
fi

if [[ ! -f "$PACK_INSTALL" ]] || [[ ! -f "$PACK_UPDATE" ]]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        colorecho "$BOLD$GREEN" "# brew detected"
        PACK_INSTALL="sudo -u $SUDO_USER brew install"
        PACK_UPDATE="sudo -u $SUDO_USER brew update"
    elif [[ -f "$(command -v pacman)" ]]; then
        colorecho "$BOLD$GREEN" "# pacman detected"
        PACK_INSTALL="pacman -S"
        PACK_UPDATE="pacman -U"
    elif [[ -f "$(command -v apt)" ]]; then
        colorecho "$BOLD$GREEN" "# apt detected"
        PACK_INSTALL="apt --yes install"
        PACK_UPDATE="apt --yes update"
    else
        >&2 colorecho "$BOLD$RED" "Could not find package manager!"
        >&2 colorecho "$BOLD$RED" "Please specify PACK_INSTALL and PACK_UPDATE!"
        exit 1
    fi
fi

if [[ "$OSTYPE" == "darwin"* ]]; then
    HOME_DIR="/Users"
else
    HOME_DIR="/home"
fi

BREW_INSTALL_COMMAND='/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"'
XCODE_TOOLS_COMMAND='xcode-select --install'

function runcmd() {
    colorecho "$BOLD$YELLOW" "$2..."
    colorecho $YELLOW " => $1"
    eval "$1"
    if [[ "$?" != "0" ]]; then
        >&2 colorecho "$BOLD$RED" "$2 failed!"
        exit 1
    fi
    colorecho "$BOLD$GREEN" "$2 successful"
}

function runasuser() {
    colorecho "$BOLD$YELLOW" "$2..."
    colorecho $YELLOW " => $1"
    eval "sudo -u $SUDO_USER $1"
    if [[ "$?" != "0" ]]; then
        >&2 colorecho "$BOLD$RED" "$2 failed!"
        exit 1
    fi
    colorecho "$BOLD$GREEN" "$2 successful"
}

function checkinstalled() {
    echo -n "- $1 "
    if [[ -f "$(command -v $1)" ]]; then
        colorecho $GREEN "found"
        return 1
    else
        colorecho $YELLOW "not found"
        return 0
    fi
}

# install brew if needed
if [[ "$OSTYPE" == "darwin"* ]]; then
    checkinstalled "brew"
    if [[ $? == 0 ]]; then
        runasuser "$BREW_INSTALL_COMMAND" "Installing homebrew"
    fi
fi

# update packages
runcmd "$PACK_UPDATE" "Updating packages"

# install finger
checkinstalled "finger"
if [[ $? == 0 ]]; then
    runcmd "$PACK_INSTALL finger" "Installing finger"
fi

# install zsh
checkinstalled "zsh"
if [[ $? == 0 ]]; then
    runcmd "$PACK_INSTALL zsh" "Installing zsh"
fi
if [[ "$(finger $SUDO_USER | grep -Eo "Shell:\s+.+$")" != *"/bin/zsh"* ]]; then
    runasuser "chsh -s /bin/zsh" "Setting default shell to zsh"
fi

# if this is macos, we should install the xcode command line tools now
if [[ "$OSTYPE" == "darwin"* ]]; then
    if [[ "" == "$(command -v clang)" ]]; then
        runcmd "$XCODE_TOOLS_COMMAND" "Installing Xcode command-line tools"
    fi
fi

# now we can start installing fun stuff that matters

# also make sure we have git, gcc, etc installed
checkinstalled "git"
if [[ $? == 0 ]]; then
    runcmd "$PACK_INSTALL git" "Installing git"
fi

if [[ "$OSTYPE" != "darwin"* ]]; then
    if [[ "$PACK_INSTALL" == *"pacman"* ]]; then
        runcmd "$PACK_INSTALL base-devel" "Installing base-devel"
    elif [[ "$PACK_INSTALL" == *"apt"* ]]; then
        runcmd "$PACK_INSTALL build-essential" "Installing build-essential"
    else
        >&2 colorecho $YELLOW "Assuming git/gcc/etc. are installed."
    fi
fi

# install make
checkinstalled "make"
if [[ $? == 0 ]]; then
    runcmd "$PACK_INSTALL make" "Installing make"
fi

# make sure we have cmake installed
checkinstalled "cmake"
if [[ $? == 0 ]]; then
    runcmd "$PACK_INSTALL cmake" "Installing CMake"
fi

# automake
checkinstalled "automake"
if [[ $? == 0 ]]; then
    runcmd "$PACK_INSTALL automake" "Installing automake"
fi

# check for libtool
checkinstalled "libtool"
if [[ $? == 0 ]]; then
    runcmd "$PACK_INSTALL libtool" "Installing libtool"
    if [[ "$PACK_INSTALL" == *"apt"* ]]; then
        runcmd "$PACK_INSTALL libtool-bin" "Installing libtool-bin"
    fi
fi

# check for pkgconfig
checkinstalled "pkg-config"
if [[ $? == 0 ]]; then
    if [[ "$PACK_INSTALL" == *"pacman"* ]]; then
        runcmd "$PACK_INSTALL pkgconf" "Installing pkg-config"
    else
        runcmd "$PACK_INSTALL pkg-config" "Installing pkg-config"
    fi
fi

# make sure that 

# we can now build nvim hopefully
checkinstalled "nvim"
if [[ $? == 0 ]]; then
    if [[ -d "/tmp/neovim" ]]; then
        rm -rf /tmp/neovim
    fi
    runcmd "git clone https://github.com/neovim/neovim /tmp/neovim" "Cloning neovim"
    cd /tmp/neovim
    runcmd "make CMAKE_BUILD_TYPE=Release USE_BUNDLED=OFF -j$(nproc)" "Building neovim"
    runcmd "make install" "Installing neovim"
    cd -
    rm -rf /tmp/neovim
fi

# install stow
checkinstalled "stow"
if [[ $? == 0 ]]; then
    runcmd "$PACK_INSTALL stow" "Installing stow"
fi

# install dotfiles
cd $HOME
if [[ ! -d "$HOME/.dotfiles" ]]; then
    runasuser "git clone https://github.com/willeccles/dotfiles '$HOME_DIR/$SUDO_USER/.dotfiles'" "Installing dotfiles"
fi
# use same conditional again in case git failed
if [[ ! -d "$HOME/.dotfiles" ]]; then
    runasuser "cd '$HOME_DIR/$SUDO_USER/.dotfiles' && stow bash zsh base vim neovim alacritty config" "Stowing dotfiles"
    colorecho $GREEN "Make sure to go to ~/.dotfiles and stow whatever else you need!"
fi
