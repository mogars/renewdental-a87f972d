Navigate to the Backend Directory Ensure you are in the root of the backend folder:

cd ~/gits/renewdental-a87f972d/backend
Install Dependencies Run npm install to install all required packages, including ts-node:

npm install
Run the Import Script Run the script from the backend directory, providing the path to your CSV file:

npm run import-patients -- src/scripts/pacienti_test.csv
Note: Using -- allows you to pass arguments through to the underlying script.