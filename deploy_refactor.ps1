git add .
git commit -m "refactor: manual start requirement, Enter Pocket banner, and relocate Sensor Diagnostics"
git push origin main
npx expo export -p web
npx surge ./dist medi-track-patient.surge.sh
npm run update:push
