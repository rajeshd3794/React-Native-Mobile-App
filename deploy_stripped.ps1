git add .
git commit -m "UI: Clean up 'Sensor Diagnostic' and 'Pocket Arming' banner. duration now strictly limits tracking time to simultaneous pocket + walking state."
git push origin main
node publish_prod.js
npm run update:push
