from flask import Flask
from flask_cors import CORS
from upload import upload_blueprint

app = Flask(__name__)
CORS(app, origins="*")

app.register_blueprint(upload_blueprint)

if __name__ == "__main__":
    app.run(debug=True)