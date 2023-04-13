local fn = vim.fn
local execute = vim.api.nvim_command
local cmd = vim.cmd

require('settings')

require('keybindings')

require('plugins')

require('commands')

require('statusline')

require('autocmds')
