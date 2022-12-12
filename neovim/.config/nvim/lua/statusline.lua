function sl_mode()
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

  return modestrings[vim.fn.mode()]:upper()
end

function sl_modified()
  return vim.bo.modified and '+' or ''
end

function sl_ftype()
  return vim.bo.filetype:gsub('[[]]', '')
end

function sl_lends()
  return vim.bo.fileformat:gsub('[[]]', '')
end

function sl_gitstatus()
  local gstat = vim.b['gitsigns_status_dict']
  if gstat ~= nil then
    local added = gstat['added']
    local changed = gstat['changed']
    local removed = gstat['removed']
    local branch = gstat['head']
    local result = branch

    if added ~= nil and added > 0 then
      result = result..string.format(' +%d', added)
    end
    if changed ~= nil and changed > 0 then
      result = result..string.format(' ~%d', changed)
    end
    if removed ~= nil and removed > 0 then
      result = result..string.format(' -%d', removed)
    end

    return vim.trim(result)
  end
  return ''
end

function _G.statusline()
  return table.concat({
    '%1*%( %{v:lua.sl_mode()} %)', --mode
    '%2*%-( %n: %<%([%R] %)%f%{v:lua.sl_modified()} %)', --file name
    '%1*%( %{v:lua.sl_ftype()} %)%( %{v:lua.sl_lends()} %)', --file type
    '%=',
    '%( [%{v:lua.sl_gitstatus()}] %)', --git
    '%( %p%% %)', --percentage through the file
    '%2*%( %l:%c%V %)', --line/column/virtual column
  })
end

vim.opt.statusline = '%{%v:lua.statusline()%}'
