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
  return vim.bo.readonly and '[RO] ' or ''
end

function modified()
  return vim.bo.modified and '+ ' or ' '
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
  return table.concat({
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
    '%2* %l:%c%V ', --line number and column number
  })
end

vim.opt.statusline = '%!v:lua.statusline()'
