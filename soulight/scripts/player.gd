extends CharacterBody2D

@export var move_speed: float = 220.0

@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D

func _physics_process(_delta: float) -> void:
	var direction := Input.get_vector("move_left", "move_right", "move_up", "move_down")

	velocity = direction * move_speed
	move_and_slide()

	sprite.play("walk" if direction else "idle")
	if direction.x:
		sprite.flip_h = direction.x < 0
