c_Red="\[\e[31m\]"
c_Cyan="\[\e[36m\]"
c_Magenta="\[\e[35m\]"
c_Green="\[\e[32m\]"
c_Yellow="\[\e[33m\]"
c_Bold="\[\e[1m\]"
c_Rst="\[\e[m\]"

PROMPT_COMMAND=__prompt_command # sets the PS1 after commands

if command -v promptus >/dev/null; then
    __prompt_command() {
        PS1="$(promptus "$?")"
    }
else
    __prompt_command() {
        local EXIT="$?"
        PS1=""

        local jobnum=$(jobs -p | wc -l | tr -d ' ')

        PS1+="${c_Bold}${c_Magenta}\W ${c_Rst}"
        #PS1+="${c_Cyan}\`parse_git_branch\`${c_Rst}"

        if [ $jobnum -ne 0 ]; then
            PS1="${c_Yellow}\j${c_Rst} $PS1"
        fi

        if [ $EXIT -ne 0 ]; then
            if [[ "$EXIT" == "${CONTROL_Z_CODE}" ]]; then
                local lastjob=$(jobs | grep "+" | perl -pe "s/[\s\t]+/ /g" | cut -d" " -f3)
                PS1="${c_Yellow}${lastjob}${c_Rst} $PS1"
            elif [[ "$EXIT" == "130" ]]; then
                PS1="${c_Yellow}^C ${C_Rst} $PS1"
            else
                PS1="${c_Red}${EXIT}${c_Rst} $PS1"
            fi
        fi

        PS1+="${c_Green}${PROMPT_CHAR}${c_Rst} "

        if [ -n "$SSH_CLIENT" ] || [ -n "$SSH_TTY" ]; then
            PS1="${c_Cyan}[\u@\h]${c_Rst} $PS1"
        fi
    }
fi

# continuation prompt (e.g. when a line ends in \)
PS2="${c_Green}${PROMPT_CHAR}${c_Rst} "

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
