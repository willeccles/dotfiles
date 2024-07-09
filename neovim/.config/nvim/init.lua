require('settings')

require('keybindings')

require('plugins')

require('commands')

require('statusline')

require('autocmds')

if vim.fn.has('linux') == 1 then
  if string.find(vim.loop.os_uname().release, "icrosoft") then
    require('wsl')
  end
end
