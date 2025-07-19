from zipfile import ZipFile
from flask import Flask, Response, request
from flask_cors import CORS
import sqlite3
import io
import json
import random
import bcrypt
import os
import shutil


app = Flask(__name__)
CORS(app, origins="*")


def gen_id():
    symbols = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
    return "".join([random.choice(symbols) for _ in range(10)])


def create_db_row(id: str, metadata: dict, owner_hash: str):
    """ returns `( query placeholder, row data )` """
    
    data = (
        id,
        metadata["title"],
        metadata["difficulty"],
        metadata["bpm"],
        metadata["first_beat"],
        metadata["preview_time"],
        metadata["measure_size"],
        metadata["snaps"],
        metadata["audio_ext"],
        metadata.get("img_ext"),        # .get() defaults to None if doesn't exist
        metadata.get("credit_audio"),
        metadata.get("credit_img"),
        metadata.get("credit_chart"),
        owner_hash
    )
    return ( ','.join( ['?'] * len(data) ) , data)

def to_metadata(row: sqlite3.Row):
    return {
        "online_id": row["id"],
        "title": row["title"],
        "difficulty": row["difficulty"],
        "bpm": row["bpm"],
        "measure_size": row["measure_size"],
        "snaps": row["snaps"],
        "audio_ext": row["audio_ext"],
        "img_ext": getattr(row, "img_ext", None),
        "credit_audio": getattr(row, "credit_audio", None),
        "credit_img": getattr(row, "credit_img", None),
        "credit_chart": getattr(row, "credit_chart", None)
    }


VALID_AUDIO_EXTS = "mp3", "wav", "aac", "ogg", "webm"
VALID_IMG_EXTS = "png", "jpg", "bmp", "webp", "avif"

def save_uploaded_files(id: str, exts: dict[str, str]):
    chart_folder = f"data/charts/{id}"
    os.makedirs(chart_folder, exist_ok=True)
    
    if "chart" in request.files:
        request.files["chart"].save(f"{chart_folder}/chart.txt")
    
    if "audio" in request.files and exts["audio_ext"] in VALID_AUDIO_EXTS:
        request.files["audio"].save(f"{chart_folder}/audio.{exts["audio_ext"]}")
    
    if "img" in request.files and exts["img_ext"] in VALID_IMG_EXTS:
        request.files["img"].save(f"{chart_folder}/img.{exts["img_ext"]}")


PAGE_SIZE = 50


@app.get("/charts/<int:page>")
def get_charts(page: int):
    with sqlite3.connect(f"{__file__}/../data/chuuni.db") as conn:
        cursor = conn.cursor()
        
        count = cursor.execute("SELECT COUNT(*) FROM charts").fetchone()[0]
        
        charts = cursor.execute(
            "SELECT id, title, bpm FROM charts LIMIT ? OFFSET ?", 
            (PAGE_SIZE, PAGE_SIZE * page)
        ).fetchall()
        
        return [count, charts]

@app.post("/charts")
def upload_chart():
    
    metadata = json.loads(request.form["metadata"])
    owner_hash = request.form["owner_hash"];
    
    online_id = gen_id()
    
    save_uploaded_files(online_id, metadata)
    
    # insert sqlite3 row
    placeholder, row_data = create_db_row(online_id, metadata, owner_hash)
    with sqlite3.connect("data/chuuni.db") as conn:
        conn.cursor().execute(f"INSERT INTO charts VALUES ({placeholder})", row_data)
    
    return online_id


@app.patch("/charts/<id>")
def update_chart(id: str):
    owner_key = request.form["owner_key"].encode();
    
    # update sqlite3 row
    with sqlite3.connect("data/chuuni.db") as conn:
        cursor = conn.cursor()
        
        old_data = cursor.execute("SELECT img_ext, owner_hash FROM charts WHERE id=?", (id,)).fetchone()
        if old_data is None:
            return Response(status=404)
        
        old_img_ext, owner_hash = old_data
        
        if bcrypt.checkpw(owner_key, owner_hash.encode()):
            metadata: dict = json.loads(request.form["metadata"])
            placeholder, new_row_data = create_db_row(id, metadata, owner_hash)
            cursor.execute(f"REPLACE INTO charts VALUES ({placeholder})", new_row_data)
        else:
            return Response(status=401)
    
    save_uploaded_files(id, metadata)
    
    # delete old image if it wasnt overwritten
    if old_img_ext is not None and old_img_ext != metadata.get("img_ext"):
        os.remove(f"data/charts/{id}/img.{old_img_ext}")
    
    return Response(status=200)


@app.delete("/charts/<id>")
def delete_chart(id: str):
    owner_key = request.data
    
    # delete sqlite3 row
    with sqlite3.connect("data/chuuni.db") as conn:
        cursor = conn.cursor()
        
        row = cursor.execute("SELECT owner_hash FROM charts WHERE id=?", (id,)).fetchone()
        if row is None:
            return Response(status=404)
        
        if bcrypt.checkpw(owner_key, row[0].encode()):
            cursor.execute("DELETE FROM charts WHERE id=?", (id,))
        else:
            return Response(status=401)
    
    # delete chart folder
    shutil.rmtree(f"data/charts/{id}")
    
    return Response(status=200)

@app.get("/charts/download/<id>")
def download_chart(id: str):
    
    # get metadata from sqlite3 row
    with sqlite3.connect("data/chuuni.db") as conn:
        conn.row_factory = sqlite3.Row
        
        row = conn.cursor().execute("SELECT * FROM charts WHERE id=?", (id,)).fetchone()
        if row is None:
            return Response(status=404)
    
    # zip chart folder
    zip_buffer = io.BytesIO()
    chart_folder = f"data/charts/{id}"
    with ZipFile(zip_buffer, mode="w") as zip:
        zip.writestr("metadata.json", json.dumps(to_metadata(row)))
        zip.write(f"{chart_folder}/chart.txt", "chart.txt")
        zip.write(f"{chart_folder}/audio.{row['audio_ext']}", f"audio.{row['audio_ext']}")
        if row["img_ext"] is not None:
            zip.write(f"{chart_folder}/img.{row['img_ext']}", f"img.{row['img_ext']}")
    
    return zip_buffer.getvalue()
    

if __name__ == "__main__":
    app.run(debug=True)