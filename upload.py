from flask import Blueprint, Response, request
import sqlite3
import zipfile
import io
import json
import random
import bcrypt

upload_blueprint = Blueprint("upload", __name__)


def gen_rand_str(n: int = 10):
    symbols = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
    return "".join([random.choice(symbols) for _ in range(n)])

@upload_blueprint.post("/charts")
def upload_chart():
    with zipfile.ZipFile(io.BytesIO(request.data)) as zip:
        metadata = json.loads(zip.read("metadata.json"))
        
        id = gen_rand_str()
        deletion_key = random.randbytes(32)
        hashed_deletion_key = bcrypt.hashpw(deletion_key, bcrypt.gensalt())
        
        # copy chart/audio/img files to chart folder
        files_to_extract = [
            "chart.txt",
            "audio." + metadata["audio_ext"],
        ]
        if metadata["img_ext"]:
            files_to_extract.append("img." + metadata["img_ext"])
        zip.extractall(f"data/charts/{id}", files_to_extract)
        
        # insert metadata as sqlite3 row
        with sqlite3.connect("data/chuuni.db") as conn:
            conn.cursor().execute(
                "INSERT INTO charts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
                (
                    id,
                    metadata["title"],
                    metadata["bpm"],
                    metadata["measure_size"],
                    metadata["snaps"],
                    metadata["audio_ext"],
                    getattr(metadata, "img_ext", None),
                    getattr(metadata, "credit_audio", None),
                    getattr(metadata, "credit_img", None),
                    getattr(metadata, "credit_chart", None),
                    hashed_deletion_key
                )
            )
        
        return [id, deletion_key.hex()]

@upload_blueprint.delete("/charts/<id>")
def delete_chart(id: str):
    deletion_key = request.data
    
    with sqlite3.connect("data/chuuni.db") as conn:
        cursor = conn.cursor()
        
        row = cursor.execute("SELECT deletion_key FROM charts WHERE id=?", id).fetchone()
        if row is None:
            return Response(status=404)
        
        hashed_key: bytes = row[0]
        
        if bcrypt.checkpw(deletion_key, hashed_key):
            cursor.execute("DELETE FROM charts WHERE id=?", id)
            return Response(status=200)
        else:
            return Response(status=401)