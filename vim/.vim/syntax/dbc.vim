if exists('b:current_syntax')
    finish
endif

"syn keyword basicLanguageKeywords BU_ BO_ SG_ EV_ VERSION NS_

syn region dbcString start='"' end='"' excludenl keepend
syn keyword dbcVersionDef VERSION nextgroup=dbcString skipwhite
syn keyword dbcMessageDef BO_ nextgroup=dbcMessageId skipwhite
syn match dbcMessageId '\d\+' nextgroup=dbcMessageName skipwhite
syn match dbcMessageName '[a-zA-Z_][a-zA-Z0-9_]*' nextgroup=dbcMessageSeparator
syn match dbcMessageSeparator ':' nextgroup=dbcMessageSize
syn match dbcMessageSize '\d\+' nextgroup=dbcMessgeTransmitter
syn match dbcMessageTransmitter '[a-zA-Z_][a-zA-Z0-9_]*'
syn region dbcMessageBlock start='BO_.\+$' end='^$' contains=dbcSignalDef fold transparent
syn keyword dbcSignalDef SG_ nextgroup=dbcSignalName skipwhite contained
syn match dbcSignalId '\d\+' nextgroup=dbcMessageName skipwhite

let b:current_syntax="dbc"

hi def link dbcString Constant
hi def link dbcVersionDef PreProc
hi def link dbcMessageDef Type
hi def link dbcMessageId Number
hi def link dbcString String
hi def link dbcMessageSize Number
