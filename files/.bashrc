export PATH=/usr/local/bin:/usr/local/sbin:~/showhidden:$PATH
export CLICOLOR=1
export EDITOR=vim

# reminder: in vim, visual mode zf = fold, za = unfold

# prompt (parse_git_branch can be found at the end of this file)
PROMPT_COMMAND=__prompt_command # sets the PS1 after commands

__prompt_command() {
	local EXIT="$?"
	PS1=""
	
	# colors
	local RCol="\[\e[0m\]" # reset format
	local BPurple="\[\e[38;5;98;1m\]"
	local Teal="\[\e[38;5;74m\]"
	local Khaki="\[\e[38;5;228m\]"
	local BRed="\[\e[38;5;160;1m\]"
	local BGreen="\[\e[38;5;148;1m\]"
	local Pink="\[\e[38;5;213m\]"
	local Orange="\[\e[38;5;214m\]"

	# number of jobs (both running and stopped) in the background
	local jobnum=$(jobs -p | wc -l | tr -d ' ')

	PS1+="${BPurple}\W ${RCol}"
	PS1+="${Teal}\`parse_git_branch\`${RCol}"

	if [ $EXIT -ne 0 ]; then
		# 146 is STOPPED, like control-z, etc.
		if [ $EXIT -ne 146 ]; then
			PS1="${BRed}${EXIT}${RCol} $PS1"
		else
			# when its 146 i want it to show me what job i stopped
			# just the command name though, no args
			local lastjob="$(ps -p $(jobs -p | sed -e '$!d') -o comm=)"
			PS1="${Orange}${lastjob}${RCol} $PS1"
		fi
	fi
	
	if [ $jobnum -ne 0 ]; then
		PS1+="${Orange}${jobnum}${RCol}"
	fi

	PS1+="${BGreen}${RCol} "
}

# continuation prompt (e.g. when a line ends in \)
PS2="\[\e[38;5;98;1m\]...\[\e[38;5;148;1m\] \[\e[0m\]"

# old stuff just for reference, etc.
#PS1='\[\e[0;31m\]\u\[\e[0m\]@\[\e[0;32m\]\h\[\e[0m\]:\[\e[0;34m\]\w\[\e[0m\]\$ '

# uncomment to enable powerline
#. /usr/local/lib/python2.7/site-packages/powerline/bindings/bash/powerline.sh

alias please='sudo $(history -p !-1)'
alias win32gpp='/usr/local/gcc-4.8.0-qt-4.8.4-for-mingw32/win32-gcc/bin/i586-mingw32-g++'
alias italics=`tput sitm`
alias noitalics=`tput ritm`

# Setting PATH for Python 3.5
# The original version is saved in .bash_profile.pysave
export PATH="/Library/Frameworks/Python.framework/Versions/3.5/bin:${PATH}"
export PATH

# git functions for prompt
# get current branch in git repo
function parse_git_branch() {
	BRANCH=`git branch 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/\1/'`
	if [ ! "${BRANCH}" == "" ]
	then
		STAT=`parse_git_dirty`
		echo " ${BRANCH}${STAT} "
	else
		echo ""
	fi
}

# get current status of git repo
function parse_git_dirty {
	status=`git status 2>&1 | tee`
	dirty=`echo -n "${status}" 2> /dev/null | grep "modified:" &> /dev/null; echo "$?"`
	untracked=`echo -n "${status}" 2> /dev/null | grep "Untracked files" &> /dev/null; echo "$?"`
	ahead=`echo -n "${status}" 2> /dev/null | grep "Your branch is ahead of" &> /dev/null; echo "$?"`
	newfile=`echo -n "${status}" 2> /dev/null | grep "new file:" &> /dev/null; echo "$?"`
	renamed=`echo -n "${status}" 2> /dev/null | grep "renamed:" &> /dev/null; echo "$?"`
	deleted=`echo -n "${status}" 2> /dev/null | grep "deleted:" &> /dev/null; echo "$?"`
	bits=''
	if [ "${renamed}" == "0" ]; then
		bits=">${bits}"
	fi
	if [ "${ahead}" == "0" ]; then
		bits="*${bits}"
	fi
	if [ "${newfile}" == "0" ]; then
		bits="+${bits}"
	fi
	if [ "${untracked}" == "0" ]; then
		bits="?${bits}"
	fi
	if [ "${deleted}" == "0" ]; then
		bits="x${bits}"
	fi
	if [ "${dirty}" == "0" ]; then
		bits="M${bits}"
	fi
	if [ ! "${bits}" == "" ]; then
		echo " ${bits}"
	else
		echo ""
	fi
}


test -e "${HOME}/.iterm2_shell_integration.bash" && source "${HOME}/.iterm2_shell_integration.bash"
