from flask import Flask, render_template
from flask_socketio import SocketIO, join_room, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

rooms = {}

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

@socketio.on('join')
def on_join(data):
    room = data['room']
    username = data.get('username')
    join_room(room)
    
    if room not in rooms:
        rooms[room] = []
    
    if username and username not in rooms[room]:
        rooms[room].append(username)
    
    emit('update_player_list', rooms[room], room=room)

@socketio.on('start_game')
def on_start(data):
    room = data['room']
    questions = data['questions']
    # Broadcast the questions to everyone in the room so they play the same game
    emit('start_game', {'questions': questions}, room=room)