extends PanelContainer

@export var id: String
@export var player_name: String


func from_dict(dict: Dictionary):
	id = dict.id
	player_name = dict.name

	$MarginContainer/HBoxContainer/PlayerNameLabel.text += player_name
