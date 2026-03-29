git add .
git commit -m "feat: duration ticks immediately, pauses with steps when out of pocket"
git push origin main
npx expo export -p web
npx surge ./dist medi-track-patient.surge.sh
npm run update:push
