; Close Notes before install/upgrade so files are not locked.
!macro preInit
  nsExec::Exec 'taskkill /F /IM Notes.exe /T'
  Sleep 1000
!macroend

!macro customInit
  nsExec::Exec 'taskkill /F /IM Notes.exe /T'
  Sleep 500
!macroend
