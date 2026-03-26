git add .
git commit -m "Apply simulateWalk feature from 9ad9f5e"
git push origin main
npx expo export -p web
npx surge ./dist medi-track-patient.surge.sh
npm run update:push
