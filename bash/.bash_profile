source $HOME/.profile
source $HOME/.bashrc

# Setting PATH for Python 3.7
# The original version is saved in .bash_profile.pysave
PATH="/Library/Frameworks/Python.framework/Versions/3.7/bin:${PATH}"
export PATH

export PATH="$HOME/.cargo/bin:$PATH"
if [ -e /Users/cactus/.nix-profile/etc/profile.d/nix.sh ]; then . /Users/cactus/.nix-profile/etc/profile.d/nix.sh; fi # added by Nix installer
