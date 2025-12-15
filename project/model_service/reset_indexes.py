# reset_indexes.py
from pymongo import MongoClient
from pymongo import ASCENDING, DESCENDING
import os

# Use the same connection string from your app
# Default to local MongoDB, can be overridden with MONGODB_URI environment variable
MONGO_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/bloodsmear')

def reset_indexes():
    try:
        print("🔗 Connecting to MongoDB...")
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client.get_database()
        
        # Get all collections
        users = db.users
        analyses = db.analyses
        
        print("\n🔍 Current indexes in 'users' collection:")
        for idx in users.list_indexes():
            print(f" - {idx['name']}: {idx}")
        
        print("\n🔍 Current indexes in 'analyses' collection:")
        for idx in analyses.list_indexes():
            print(f" - {idx['name']}: {idx}")
        
        print("\n🔄 Resetting indexes...")
        
        # Drop all indexes except _id_
        for coll in [users, analyses]:
            for idx in coll.list_indexes():
                if idx['name'] != '_id_':
                    try:
                        coll.drop_index(idx['name'])
                        print(f"✅ Dropped index: {idx['name']}")
                    except Exception as e:
                        print(f"⚠️  Could not drop {idx['name']}: {str(e)}")
        
        # Create fresh indexes
        print("\n🆕 Creating new indexes...")
        
        # Users collection
        users.create_index([("username", ASCENDING)], 
                         unique=True, 
                         name="username_idx")
        print("✅ Created username index")
        
        users.create_index([("email", ASCENDING)], 
                         unique=True, 
                         name="email_idx")
        print("✅ Created email index")
        
        # Analyses collection
        analyses.create_index([("user_id", ASCENDING), 
                            ("created_at", DESCENDING)],
                           name="user_analyses_idx")
        print("✅ Created user_analyses index")
        
        print("\n✅ All indexes reset successfully!")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        print("\n💡 Make sure MongoDB is running locally on port 27017.")
        print("   To start MongoDB: mongod (or use MongoDB service)")
        print("   For authenticated MongoDB, set MONGODB_URI environment variable with credentials.")

if __name__ == "__main__":
    reset_indexes()