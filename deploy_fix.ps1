git add .
git commit -m "Fix step cumulative sum bug with pocket logic"
git push origin main
npx expo export -p web
npx surge ./dist medi-track-patient.surge.sh
npm run update:push
