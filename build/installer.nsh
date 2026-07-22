; Ensure a running Notes instance exits before the updater replaces files.
; Use graceful taskkill (no /F) so the app can flush saves; electron also exits
; explicitly when the user chooses "Restart & update".
!macro customInit
  nsExec::Exec 'taskkill /IM Notes.exe /T'
  Sleep 1500
!macroend
