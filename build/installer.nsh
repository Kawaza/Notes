; Ensure a running Notes instance exits before the updater replaces files.
; Use graceful taskkill (no /F) so the app can flush saves; electron also exits
; explicitly when the user chooses "Restart & update".
!macro customInit
  nsExec::Exec 'taskkill /IM Notes.exe /T'
  Sleep 1500
!macroend

; Desktop shortcut uses a separate icon; taskbar/start menu keep the exe icon.
!macro customInstall
  CreateShortCut "$DESKTOP\Notes.lnk" "$INSTDIR\Notes.exe" "" "$INSTDIR\desktop-icon.ico" 0
!macroend

!macro customUnInstall
  Delete "$DESKTOP\Notes.lnk"
!macroend
