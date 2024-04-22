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
	var color = "green" if DataStore.player_id == player_id else "white"
	$Background/PlayerNumber.text = "[color=%s]%s[/color]" % [color, player_number]
	$Background/PlayerName.text = "[right][color=%s]%s[/color][/right]" % [color, player_name]


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
