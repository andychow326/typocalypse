extends Control

@export var player_id: String
@export var player_name: String
@export var player_number: String
@export var player_health: int

var heart_full = preload("res://assets/hud/heart_full.png")
var heart_empty = preload("res://assets/hud/heart_emptied.png")


func set_info(user_id, username: String, number, health):
	player_id = user_id
	player_name = username
	player_number = "P" + str(number)
	player_health = health
	$Background/PlayerName.text = player_name
	$Background/PlayerNumber.text = player_number


func update_health(health):
	player_health = health


func _process(_delta):
	var i = 0
	for child in $Background/HealthBar.get_children():
		if player_health > i:
			child.texture = heart_full
		else:
			child.texture = heart_empty
		i += 1
