echo ">>>> HTML Validator"
html-validator --file index.html --verbose
# echo "HTML Hint"
# htmlhint index.html
echo ""
echo ">>>> Selector check"
python3 check_selectors.py
echo ""
echo ">>>> Check links are not broken"
linkchecker index.html
