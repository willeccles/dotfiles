function mode()
  local modestrings = {
    ['n']  = 'N',
    ['no'] = 'N·OP',
    ['v']  = 'V',
    ['V']  = 'V·L',
    [''] = 'V·B',
    ['s']  = 'S',
    ['S']  = 'S·L',
    [''] = 'S·B',
    ['i']  = 'I',
    ['R']  = 'R',
    ['Rv'] = 'V·R',
    ['c']  = 'Cmd',
    ['cv'] = 'V·Ex',
    ['ce'] = 'Ex',
    ['r']  = 'P',
    ['rm'] = 'M',
    ['r?'] = 'Conf',
    ['!']  = 'Sh',
    ['t']  = 'T',
  }

  return '%1* '..modestrings[vim.fn.mode()]:upper()..' '
end

function rdonly()
  return vim.b.readonly and '[RO] ' or ''
end

function modified()
  return vim.b.modified and '+ ' or ' '
end

function ftype()
  local str = vim.bo.filetype:gsub('[[]]', '')
  if str:len() > 0 then
    return ' '..str..' '
  else
    return str
  end
end

function lends()
  local format = vim.bo.fileformat:gsub('[[]]', '')
  return ' '..format..' '
end

function gitstatus()
  local gstat = vim.b['gitsigns_status_dict']
  if gstat ~= nil then
    local added = gstat['added']
    local changed = gstat['changed']
    local removed = gstat['removed']
    local branch = gstat['head']
    local result = ''

    if added ~= nil and added > 0 then
      result = result..string.format(' +%d', added)
    end
    if changed ~= nil and changed > 0 then
      result = result..string.format(' ~%d', changed)
    end
    if removed ~= nil and removed > 0 then
      result = result..string.format(' -%d', removed)
    end

    if branch == nil then
      branch = ''
    end

    if result:len() > 0 then
      result = string.format('[%s] ', vim.trim(result))
    end

    return string.format(' %s %s', branch, result)
  end
  return ''
end

function _G.statusline()
  local parts = {
    mode(), --mode
    '%2* %n: ', -- buffer number
    rdonly(), --read-only status
    '%f', --filename
    modified(), --modified status
    '%1*'..ftype(), --file type
    lends(), --line endings
    '%=', --right justify
    gitstatus(), --git status
    ' %p%% ', --percentage through the file
    '%2* L%l:C%c ', --line number and column number
  }

  return table.concat(parts)
end


--default status line colors which have to be specified because this is compared
--with StatusLineNC when falling back to that
vim.cmd [[highlight StatusLine guibg=#3c3836 guifg=#ebdbb2]]
--non-focused status line colors to fall back to when User1..2 aren't used
vim.cmd [[highlight StatusLineNC guibg=#32302f guifg=#bdae93]]

--use these with %1* and %2*
vim.cmd [[highlight User1 guibg=#3c3836 guifg=#928374]]
vim.cmd [[highlight User2 guibg=#3c3836 guifg=#ebdbb2]]
--vim.api.nvim_set_hl(0, 'StatusLine',   {guibg='#3c3836', guifg='#ebdbb2'})
--vim.api.nvim_set_hl(0, 'StatusLineNC', {guibg='#32302f', guifg='#bdae93'})
--vim.api.nvim_set_hl(0, 'User1',        {guibg='#3c3836', guifg='#928374'})
--vim.api.nvim_set_hl(0, 'User2',        {guibg='#3c3836', guifg='#ebdbb2'})

vim.o.statusline = '%!v:lua.statusline()'
vim.wo.statusline = vim.o.statusline
