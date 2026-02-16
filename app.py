from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/game")
def game():
    return render_template("game.html")

@app.route("/highscores")
def highscores():
    return render_template("highscores.html")

@app.route("/end")
def end():
    return render_template("end.html")