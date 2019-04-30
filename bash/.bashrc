# reminder: in vim, visual mode zc = close fold, za = open fold

source .path

# colors {{{
# these are now all set by the terminal's colors, 0-15
# this is in an attempt to unify my colors everywhere

# add a ;1 at the end of a color code for bold
pwdcolor="5;1"
gitcolor="6"
exitcolor="1;1"
promptcolor="2;1"
unamecolor="12"
jobcolor="3"

# actual color codes (separated for ease of reading) {{{
c_Rst="\[\e[0m\]" # reset format
c_Pwd="\[\e[38;5;${pwdcolor}m\]"
c_Git="\[\e[38;5;${gitcolor}m\]"
c_Exit="\[\e[38;5;${exitcolor}m\]"
c_Prompt="\[\e[38;5;${promptcolor}m\]"
c_Uname="\[\e[38;5;${unamecolor}m\]"
c_Job="\[\e[38;5;${jobcolor}m\]"
# }}}
# }}}

# prompt {{{
PROMPT_COMMAND=__prompt_command # sets the PS1 after commands

__prompt_command() {
	local EXIT="$?"
	PS1=""

	# number of jobs (both running and stopped) in the background
	local jobnum=$(jobs -p | wc -l | tr -d ' ')

	if [ -n "$SSH_CLIENT" ] || [ -n "$SSH_TTY" ]; then
		PS1+="${c_Uname}\u${c_Pwd}@"
	fi
	PS1+="${c_Pwd}\W ${c_Rst}"
	PS1+="${c_Git}\`parse_git_branch\`${c_Rst}"

	if [ $EXIT -ne 0 ]; then
		# 146 is STOPPED, like control-z, etc.
		if [ $EXIT -eq 146 ]; then
			# when its 146 i want it to show me what job i stopped
			# just the command name though, no args
			local lastjob="$(ps -p $(jobs -p | sed -e '$!d') -o comm=)"
			PS1="${c_Job}${lastjob}${c_Rst} $PS1"
		elif [ $EXIT -eq 130 ]; then
			PS1="${c_Job}^C${C_Rst} $PS1"
		else
			PS1="${c_Exit}${EXIT}${c_Rst} $PS1"
		fi
	fi
	
	if [ $jobnum -ne 0 ]; then
		PS1+="${c_Job}${jobnum}${c_Rst}"
	fi

	PS1+="${c_Prompt}${c_Rst} "
}

# continuation prompt (e.g. when a line ends in \)
PS2="${c_Pwd}...${c_Prompt} ${c_Rst}"
# }}}

# old stuff just for reference, etc. {{{
#PS1='\[\e[0;31m\]\u\[\e[0m\]@\[\e[0;32m\]\h\[\e[0m\]:\[\e[0;34m\]\w\[\e[0m\]\$ '
# }}}

# powerline stuff {{{
#. /usr/local/lib/python2.7/site-packages/powerline/bindings/bash/powerline.sh
# }}}

# some aliases {{{
alias please='sudo $(history -p !-1)'
alias win32gpp='/usr/local/gcc-4.8.0-qt-4.8.4-for-mingw32/win32-gcc/bin/i586-mingw32-g++'
alias italics=`tput sitm`
alias noitalics=`tput ritm`
alias ls=~/ls-icons
# }}}

# git functions for prompt {{{
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
# }}}
