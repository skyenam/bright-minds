from flask import Flask, render_template
from flask_socketio import SocketIO, join_room, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

rooms = {}
room_scores = {}

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
    
    # Reset scores for the new game
    room_scores[room] = []
    
    # Broadcast the questions to everyone in the room so they play the same game
    emit('start_game', {'questions': questions}, room=room)

@socketio.on('submit_score')
def on_submit_score(data):
    room = data['room']
    username = data['username']
    score = data['score']
    
    if room not in room_scores:
        room_scores[room] = []
    
    # Add score (filter out previous score from same user if needed, or just append)
    room_scores[room] = [s for s in room_scores[room] if s['username'] != username]
    room_scores[room].append({'username': username, 'score': score})
    
    # Sort by score descending
    room_scores[room].sort(key=lambda x: x['score'], reverse=True)
    
    emit('update_leaderboard', room_scores[room], room=room)