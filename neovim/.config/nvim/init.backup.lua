local fn = vim.fn
local execute = vim.api.nvim_command
local cmd = vim.cmd

require('settings')

local install_path = fn.stdpath('data')..'/site/pack/packer/opt/packer.nvim'
if fn.empty(fn.glob(install_path)) > 0 then
  execute('!git clone https://github.com/wbthomason/packer.nvim '..install_path)
end

cmd 'packadd packer.nvim'
cmd 'autocmd BufWritePost plugins.lua PackerCompile'

require('plugins')
