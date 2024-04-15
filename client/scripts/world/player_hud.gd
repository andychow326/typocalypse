extends Control

@export var player_id: String
@export var player_name: String
@export var player_number: String

var heart_full = preload("res://assets/hud/heart_full.png")
var heart_empty = preload("res://assets/hud/heart_emptied.png")
var health = 5


func set_info(user_id, username: String, number):
	player_id = user_id
	player_name = username
	player_number = "P" + str(number)
	$Background/PlayerName.text = player_name
	$Background/PlayerNumber.text = player_number


func get_health():
	#Fetch health from worker code to be added
	return health


func update_health(health):
	for i in $Background/HealthBar.get_child_count():
		if health > i:
			$Background/HealthBar.get_child(i).texture = heart_full
		else:
			$Background/HealthBar.get_child(i).texture = heart_empty


func minus_health():
	var health = get_health()
	update_health(health - 1)


func add_health():
	var health = get_health()
	update_health(health + 1)
