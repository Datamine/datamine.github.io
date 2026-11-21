echo ">>>> HTML Validator"
html-validator --file index.html --verbose
# echo "HTML Hint"
# htmlhint index.html
echo ""
echo ">>>> Selector check"
npm run check:selectors
echo ""
echo ">>>> Check links are not broken"
linkchecker index.html --check-extern --no-status --no-warnings
