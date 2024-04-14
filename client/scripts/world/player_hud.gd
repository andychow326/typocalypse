extends Control

var heart_full = preload("res://assets/hud/heart_full.png")
var heart_empty = preload("res://assets/hud/heart_emptied.png")
var player_number
var player_name


# Called when the node enters the scene tree for the first time.
func _ready():
	pass  # Replace with function body.


func set_info(player_name: String, player_num):
	player_name = player_name
	player_number = "P" + str(player_num)
	$Background/PlayerName.text = player_name
	$Background/PlayerNumber.text = player_number


func update_health(value):
	for i in $HealthBar.get_child_count():
		if value > i:
			$HealthBar.get_child(i).texture = heart_full
		else:
			$HealthBar.get_child(i).texture = heart_empty


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	pass
